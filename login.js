
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');

    // Redirigir si ya está autenticado
    fetch('/api/check-auth')
        .then(res => res.json())
        .then(data => {
            if (data.isAuthenticated) {
                window.location.href = '/';
            }
        });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.style.display = 'none';

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                const data = await response.json();
                // Guardar el rol del usuario para usarlo en la app principal
                sessionStorage.setItem('userRole', data.role);
                window.location.href = '/'; // Redirigir a la página principal
            } else {
                const errorData = await response.json();
                errorMessage.textContent = errorData.error || 'Error al iniciar sesión.';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            errorMessage.textContent = 'No se pudo conectar con el servidor.';
            errorMessage.style.display = 'block';
        }
    });
});
