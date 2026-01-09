"""
Encryption utilities for sensitive data at rest.

Uses Fernet symmetric encryption for storing sensitive tokens.
The encryption key should be set via ENCRYPTION_KEY environment variable.
"""
import os
import base64
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


def get_encryption_key() -> bytes:
    """
    Get or derive the encryption key from environment.

    Uses ENCRYPTION_KEY env var directly if it's a valid Fernet key (32 bytes, base64).
    Otherwise derives a key from it using PBKDF2.

    Returns:
        bytes: A valid Fernet key

    Raises:
        ValueError: If ENCRYPTION_KEY is not set in production
    """
    key = os.getenv('ENCRYPTION_KEY')
    env = os.getenv('FLASK_ENV', 'development')

    if not key:
        if env == 'production':
            raise ValueError(
                'ENCRYPTION_KEY must be set in production. '
                'Generate one with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"'
            )
        # Development fallback - NOT SECURE
        key = 'dev-encryption-key-not-for-production'

    # Check if it's already a valid Fernet key
    try:
        if len(base64.urlsafe_b64decode(key)) == 32:
            return key.encode() if isinstance(key, str) else key
    except Exception:
        pass

    # Derive a key from the provided string
    salt = b'tradeup-salt-v1'  # Static salt is fine since key is secret
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    derived_key = base64.urlsafe_b64encode(kdf.derive(key.encode()))
    return derived_key


_fernet_instance = None


def get_fernet() -> Fernet:
    """Get a Fernet instance for encryption/decryption."""
    global _fernet_instance
    if _fernet_instance is None:
        _fernet_instance = Fernet(get_encryption_key())
    return _fernet_instance


def encrypt_value(value: str) -> str:
    """
    Encrypt a string value.

    Args:
        value: The plaintext string to encrypt

    Returns:
        The encrypted value as a base64 string
    """
    if not value:
        return value

    fernet = get_fernet()
    encrypted = fernet.encrypt(value.encode())
    return encrypted.decode()


def decrypt_value(encrypted_value: str) -> str:
    """
    Decrypt an encrypted string value.

    Args:
        encrypted_value: The encrypted base64 string

    Returns:
        The decrypted plaintext string

    Raises:
        InvalidToken: If the value cannot be decrypted (wrong key or corrupted)
    """
    if not encrypted_value:
        return encrypted_value

    fernet = get_fernet()
    try:
        decrypted = fernet.decrypt(encrypted_value.encode())
        return decrypted.decode()
    except InvalidToken:
        # Value might be stored unencrypted (migration case)
        # Return as-is and log warning
        import logging
        logging.warning('Failed to decrypt value - may be unencrypted legacy data')
        return encrypted_value


def is_encrypted(value: str) -> bool:
    """
    Check if a value appears to be encrypted.

    Encrypted values are Fernet tokens which start with 'gAAAAA'.
    """
    if not value:
        return False
    return value.startswith('gAAAAA')
