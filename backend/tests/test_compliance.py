"""Unit tests for User Compliance, Signup Agreement, and Reporting."""

import pytest
from pydantic import ValidationError
from app.api.auth import SignupRequest, LAGOS_LGAS


def test_signup_agreement_required():
    """Signup must fail if user did not accept Terms and Acceptable Use Policy."""
    with pytest.raises(ValidationError) as excinfo:
        SignupRequest(
            phone="+2348012345678",
            name="Biodun Adeleke",
            password="StrongPassword123!",
            lga="Ikeja",
            agree_to_policy=False,  # Did not agree
        )
    assert "must accept Reva's Terms of Service" in str(excinfo.value)


def test_signup_agreement_accepted():
    """Signup succeeds when agree_to_policy is True."""
    req = SignupRequest(
        phone="+2348012345678",
        name="Biodun Adeleke",
        password="StrongPassword123!",
        lga="Ikeja",
        agree_to_policy=True,
    )
    assert req.agree_to_policy is True
    assert req.lga == "Ikeja"
