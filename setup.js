document.getElementById('setupForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('fullName').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorMessage = document.getElementById('error-message');

    if (password !== confirmPassword) {
        errorMessage.textContent = 'Las contraseñas no coinciden.';
        return;
    }

    try {
        const response = await fetch('/api/setup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, username, password })
        });

        const result = await response.json();

        if (response.ok) {
            alert('Cuenta de administrador creada exitosamente. Ahora serás redirigido a la página de inicio de sesión.');
            window.location.href = '/login.html';
        } else {
            errorMessage.textContent = result.error || 'Ocurrió un error al crear la cuenta.';
        }
    } catch (error) {
        errorMessage.textContent = 'Error de conexión con el servidor.';
        console.error('Error en el setup:', error);
    }
});