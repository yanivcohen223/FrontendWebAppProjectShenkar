import { AuthService } from '../services/authService.js';

document.addEventListener("DOMContentLoaded", () => {
    const authForm = document.getElementById("authForm");
    const confirmPasswordGroup = document.getElementById("confirmPasswordGroup");

    let isLogin = true;

    const passwordInput = document.getElementById('password');
    const toggleIcon = document.querySelector('.toggle-password');

    if (toggleIcon) {
        toggleIcon.addEventListener('click', () => {
            const isHidden = passwordInput.type === 'password';
            passwordInput.type = isHidden ? 'text' : 'password';
            toggleIcon.classList.toggle('fa-eye-slash', !isHidden);
            toggleIcon.classList.toggle('fa-eye', isHidden);
        });
    }

    authForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        if (email === "") { showToast("Email is required", "red"); return; }
        if (password === "") { showToast("Password is required", "red"); return; }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) { showToast("Invalid email address", "red"); return; }
        if (password.length < 6) { showToast("Password must be at least 6 characters", "red"); return; }

        if (!isLogin) {
            const confirmPassword = document.getElementById("confirmPassword").value.trim();
            if (password !== confirmPassword) { showToast("Passwords do not match", "red"); return; }
        }

        AuthService.login(email, password)
            .then(() => {
                showToast('Login successful!', 'green');
                setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
            })
            .catch(err => {
                if (err.message === 'INVALID_CREDENTIALS') {
                    showToast('Invalid email or password.', 'red');
                } else if (err.message === 'NO_TRAINER_PROFILE') {
                    showToast('No trainer profile for this account.', 'red');
                } else {
                    showToast('Login failed. Try again.', 'red');
                }
            });
    });

    document.getElementById("toggleLink").addEventListener("click", (e) => {
        e.preventDefault();
        isLogin = !isLogin;
        document.getElementById("formTitle").textContent = isLogin ? "Login" : "Sign Up";
        document.getElementById("submitBtn").textContent = isLogin ? "Enter" : "Create Account";
        document.getElementById("toggleLink").textContent = isLogin ? "Sign up!" : "Already have an account? Login!";
        confirmPasswordGroup.style.display = isLogin ? "none" : "block";
    });

    function showToast(text, color) {
        const toast = document.getElementById("toast");
        if (!toast) return;
        toast.textContent = text;
        toast.style.backgroundColor = color;
        toast.className = "show";
        setTimeout(() => { toast.className = "fadeout"; }, 2000);
        setTimeout(() => { toast.className = ""; }, 2500);
    }
});