document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const form = e.target;
  const data = {
    name: form.name.value,
    email: form.email.value,
    phone: form.phone.value,
    password: form.password.value,
  };

  try {
    const res = await fetch('http://localhost:3000/api/customer/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (res.ok) {
      alert(result.message);
      form.reset();
    } else {
      alert(result.error || 'Registration failed');
    }
  } catch (err) {
    alert('Error connecting to server');
  }
});
