const API = 'https://art-flower-relay.oreillybeaufieldpark.workers.dev';
const flower = document.querySelector('#flower');
const status = document.querySelector('#flower-status');

async function refreshFlower() {
  try {
    const response = await fetch(`${API}/state`, { cache: 'no-store' });
    if (!response.ok) throw new Error();
    const state = await response.json();
    const changed = state.flower === 'sunflower';
    flower.classList.toggle('changed', changed);
    flower.disabled = changed;
    if (changed) {
      flower.setAttribute('aria-label', 'The signal was sent; the flower is now a sunflower');
      status.textContent = 'Your signal was sent.';
    }
  } catch {
    status.textContent = 'The flower state is temporarily unavailable.';
  }
}

flower.addEventListener('click', async () => {
  if (flower.classList.contains('changed') || flower.disabled) return;
  const pin = window.prompt('Enter the PIN to send the signal:');
  if (pin === null) return;
  flower.disabled = true;
  flower.classList.add('sending');
  status.textContent = 'Checking the PIN…';
  try {
    const response = await fetch(`${API}/press`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'The request was not accepted.');
    status.textContent = 'Accepted. Waiting for the Pi to send the email…';
    window.setTimeout(async () => {
      await refreshFlower();
      if (!flower.classList.contains('changed')) flower.disabled = false;
    }, 65000);
  } catch (error) {
    flower.disabled = false;
    status.textContent = error.message;
  } finally {
    flower.classList.remove('sending');
  }
});

refreshFlower();
window.setInterval(refreshFlower, 60000);
