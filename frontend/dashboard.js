// dashboard.js

document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    alert('Please login first!');
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('customerName').textContent = user.name;
  document.getElementById('name').textContent = user.name;
  document.getElementById('email').textContent = user.email;
  document.getElementById('phone').textContent = user.phone;

  fetchUpcomingReservations(user.id);
});

function logout() {
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

function fetchUpcomingReservations(customerId) {
  fetch(`http://localhost:3000/api/customers/${customerId}/reservations`)
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById('upcomingReservations');
      if (data.length === 0) {
        container.innerHTML = '<p>No upcoming reservations.</p>';
        return;
      }

      data.forEach(res => {
        const div = document.createElement('div');
        div.className = 'reservation-card';
        div.innerHTML = `
          <p><strong>Room:</strong> ${res.room_type} - #${res.room_number}</p>
          <p><strong>Check-in:</strong> ${res.check_in}</p>
          <p><strong>Check-out:</strong> ${res.check_out}</p>
          <p><strong>Status:</strong> ${res.status}</p>
        `;
        container.appendChild(div);
      });
    })
    .catch(err => {
      console.error('Error loading reservations:', err);
    });
}
