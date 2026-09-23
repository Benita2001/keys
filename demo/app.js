const decision = document.querySelector('#decision');
const mandate = document.querySelector('#mandate');

document.querySelector('#start').addEventListener('click', () => {
  document.querySelector('#journey').scrollIntoView({ behavior: 'smooth' });
});

document.querySelector('#check').addEventListener('click', () => {
  decision.textContent = 'ESCALATE · GUARDIAN REVIEW REQUIRED — Maya may propose this action, but her current mandate does not create execution authority.';
  decision.dataset.state = 'escalate';
  mandate.textContent = 'PROPOSE';
});
