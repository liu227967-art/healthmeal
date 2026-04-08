from services.auth_service import hash_password, verify_password, create_access_token, decode_token

def test_hash_and_verify_password():
    hashed = hash_password("secret123")
    assert verify_password("secret123", hashed) is True
    assert verify_password("wrong", hashed) is False

def test_create_and_decode_token():
    token = create_access_token({"sub": "42", "role": "trial"})
    payload = decode_token(token)
    assert payload["sub"] == "42"
    assert payload["role"] == "trial"
