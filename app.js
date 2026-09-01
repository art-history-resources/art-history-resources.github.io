const API = 'https://art-flower-relay.oreillybeaufieldpark.workers.dev';
const flower = document.querySelector('#flower');
const status = document.querySelector('#flower-status');
const DEVICE_TOKEN_KEY = 'artFlowerDeviceToken';

async function refreshFlower() {
  try {
    const response = await fetch(`${API}/state`, { cache: 'no-store' });
    if (!response.ok) throw new Error();
    const state = await response.json();
    const changed = state.flower === 'sunflower';
    flower.classList.toggle('changed', changed);
    if (!flower.classList.contains('pending')) flower.disabled = false;
    if (changed) {
      flower.setAttribute('aria-label', 'Change the sunflower to a daisy');
    } else {
      flower.setAttribute('aria-label', 'Change the daisy to a sunflower');
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
  const deviceToken = window.localStorage.getItem(DEVICE_TOKEN_KEY);
  const pin = deviceToken ? null : window.prompt('Enter the PIN to authorise this browser:');
  if (!deviceToken && pin === null) return;
  const previousFlower = flower.classList.contains('changed') ? 'sunflower' : 'daisy';
  flower.disabled = true;
  flower.classList.add('pending');
  status.textContent = 'Checking the PIN…';
  try {
    const response = await fetch(`${API}/press`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deviceToken ? { deviceToken } : { pin }),
    });
    const result = await response.json();
    if (!response.ok) {
      if (deviceToken && response.status === 401) window.localStorage.removeItem(DEVICE_TOKEN_KEY);
      throw new Error(deviceToken && response.status === 401 ? 'Authorisation expired. Press again to enter the PIN.' : result.error || 'The request was not accepted.');
    }
    if (result.deviceToken) window.localStorage.setItem(DEVICE_TOKEN_KEY, result.deviceToken);
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
