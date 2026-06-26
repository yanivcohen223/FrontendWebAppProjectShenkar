import { AuthService } from '../services/authService.js';
import { showToast } from '../shared/toast.js';

// Login / Sign-up form: checks the inputs, flips between modes, and logs the trainer in.
document.addEventListener("DOMContentLoaded", () => {
    const authForm = document.getElementById("authForm");
    const confirmPasswordGroup = document.getElementById("confirmPasswordGroup");

    let isLogin = true;

    const passwordInput = document.getElementById('password');
    const toggleIcon = document.querySelector('.toggle-password');

    // Show/hide the password when the eye icon is clicked.
    if (toggleIcon) {
        toggleIcon.addEventListener('click', () => {
            const isHidden = passwordInput.type === 'password';
            passwordInput.type = isHidden ? 'text' : 'password';
            toggleIcon.classList.toggle('fa-eye-slash', !isHidden);
            toggleIcon.classList.toggle('fa-eye', isHidden);
        });
    }

    // Validate the fields (plus the confirm field in sign-up), then try to log in.
    authForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        if (email === "") { showToast("Email is required", 'error'); return; }
        if (password === "") { showToast("Password is required", 'error'); return; }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) { showToast("Invalid email address", 'error'); return; }
        if (password.length < 6) { showToast("Password must be at least 6 characters", 'error'); return; }

        if (!isLogin) {
            const confirmPassword = document.getElementById("confirmPassword").value.trim();
            if (password !== confirmPassword) { showToast("Passwords do not match", 'error'); return; }
        }

        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        submitBtn.innerHTML = '<span class="btn-spinner"></span> ' + originalText;

        const action = isLogin
            ? AuthService.login(email, password)
            : AuthService.signup(email, password);

        action
            .then(() => {
                if (isLogin) {
                    showToast('Login successful!', 'success');
                    setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
                } else {
                    return AuthService.login(email, password).then(() => {
                        showToast('Account created! Complete your profile in Settings.', 'success');
                        setTimeout(() => { window.location.href = 'settings.html'; }, 1500);
                    });
                }
            })
            .catch(err => {
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
                submitBtn.textContent = originalText;
                if (err.message === 'INVALID_CREDENTIALS') {
                    showToast('Invalid email or password.', 'error');
                } else if (err.message === 'NO_TRAINER_PROFILE') {
                    showToast('No trainer profile for this account.', 'error');
                } else if (err.message === 'EMAIL_EXISTS') {
                    showToast('An account with this email already exists.', 'error');
                } else {
                    showToast(isLogin ? 'Login failed. Try again.' : 'Sign up failed. Try again.', 'error');
                }
            });
    });

    // Flip the form between Login and Sign Up modes.
    document.getElementById("toggleLink").addEventListener("click", (e) => {
        e.preventDefault();
        isLogin = !isLogin;
        document.getElementById("formTitle").textContent = isLogin ? "Login" : "Sign Up";
        document.getElementById("submitBtn").textContent = isLogin ? "Enter" : "Create Account";
        document.getElementById("toggleLink").textContent = isLogin ? "Sign up!" : "Already have an account? Login!";
        confirmPasswordGroup.style.display = isLogin ? "none" : "block";
    });

});