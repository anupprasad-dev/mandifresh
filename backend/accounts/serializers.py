from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from .models import SellerProfile, User

PHONE_RE = r"^[0-9+\-\s]{7,15}$"


class UserSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="seller_profile.store_name", read_only=True, default=None)
    seller_approved = serializers.BooleanField(source="seller_profile.is_approved", read_only=True, default=None)

    class Meta:
        model = User
        fields = ("id", "name", "email", "phone", "role", "store_name", "seller_approved")
        read_only_fields = ("id", "email", "role", "store_name", "seller_approved")


class ProfileUpdateSerializer(serializers.ModelSerializer):
    phone = serializers.RegexField(PHONE_RE, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ("name", "phone")


class BaseRegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    phone = serializers.RegexField(PHONE_RE, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, attrs):
        probe = User(email=attrs.get("email", ""), name=attrs.get("name", ""))
        try:
            validate_password(attrs["password"], user=probe)
        except Exception as exc:  # django ValidationError -> DRF
            raise serializers.ValidationError({"password": list(getattr(exc, "messages", [str(exc)]))})
        return attrs


class CustomerRegisterSerializer(BaseRegisterSerializer):
    def create(self, data):
        return User.objects.create_user(
            email=data["email"], password=data["password"], name=data["name"],
            phone=data.get("phone", ""), role=User.Role.CUSTOMER,
        )


class SellerRegisterSerializer(BaseRegisterSerializer):
    store_name = serializers.CharField(max_length=120)
    city = serializers.CharField(max_length=80, required=False, allow_blank=True)

    @transaction.atomic
    def create(self, data):
        user = User.objects.create_user(
            email=data["email"], password=data["password"], name=data["name"],
            phone=data.get("phone", ""), role=User.Role.SELLER,
        )
        SellerProfile.objects.create(user=user, store_name=data["store_name"], city=data.get("city", ""))
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(trim_whitespace=False)
    required_role = None  # set by subclasses

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"), email=attrs["email"].strip().lower(), password=attrs["password"]
        )
        # Same generic error for wrong password, unknown user, or wrong portal -> no account enumeration.
        if user is None or not user.is_active or user.role != self.required_role:
            raise serializers.ValidationError({"detail": "Invalid email or password."})
        attrs["user"] = user
        return attrs


class CustomerLoginSerializer(LoginSerializer):
    required_role = User.Role.CUSTOMER


class SellerLoginSerializer(LoginSerializer):
    required_role = User.Role.SELLER


class AdminLoginSerializer(LoginSerializer):
    required_role = User.Role.ADMIN


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(trim_whitespace=False)
    new_password = serializers.CharField(trim_whitespace=False)

    def validate_old_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate_new_password(self, value):
        try:
            validate_password(value, user=self.context["request"].user)
        except Exception as exc:
            raise serializers.ValidationError(list(getattr(exc, "messages", [str(exc)])))
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(trim_whitespace=False)
