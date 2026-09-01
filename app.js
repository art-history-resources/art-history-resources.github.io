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
    if (!flower.classList.contains('pending')) flower.disabled = false;
    if (changed) {
      flower.setAttribute('aria-label', 'Enter the PIN and change the sunflower to a daisy');
    } else {
      flower.setAttribute('aria-label', 'Enter the PIN and change the daisy to a sunflower');
    }
    if (!flower.classList.contains('pending')) status.textContent = `The Pi says ${changed ? 'sunflower' : 'daisy'}. Press it to change.`;
    return state.flower;
  } catch {
    status.textContent = 'The flower state is temporarily unavailable.';
    return null;
  }
}

async function waitForChange(previousFlower) {
  const deadline = Date.now() + 2 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise(resolve => window.setTimeout(resolve, 3000));
    const currentFlower = await refreshFlower();
    if (currentFlower && currentFlower !== previousFlower) return true;
  }
  return false;
}

flower.addEventListener('click', async () => {
  if (flower.disabled) return;
  const pin = window.prompt('Enter the PIN to send the signal:');
  if (pin === null) return;
  const previousFlower = flower.classList.contains('changed') ? 'sunflower' : 'daisy';
  flower.disabled = true;
  flower.classList.add('pending');
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
    const changed = await waitForChange(previousFlower);
    if (!changed) throw new Error('The Pi has not confirmed the email yet. Please try again later.');
    status.textContent = 'The email was sent and the flower changed.';
  } catch (error) {
    status.textContent = error.message;
  } finally {
    flower.classList.remove('pending');
    flower.disabled = false;
  }
});

refreshFlower();
window.setInterval(refreshFlower, 60000);
