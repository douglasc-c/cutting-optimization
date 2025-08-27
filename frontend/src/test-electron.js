// Script de teste para verificar a API do Electron
console.log('Testando API do Electron...');

// Verificar se estamos no Electron
if (window.electronAPI) {
  console.log('✅ API do Electron disponível');
  console.log('Métodos disponíveis:', Object.keys(window.electronAPI));
  
  // Testar chamada básica
  window.electronAPI.getAppName()
    .then(name => {
      console.log('✅ Nome da aplicação:', name);
    })
    .catch(err => {
      console.error('❌ Erro ao obter nome da aplicação:', err);
    });
} else {
  console.log('❌ API do Electron não disponível');
  console.log('Isso é normal se executado no navegador');
}

// Verificar se estamos no ambiente correto
console.log('User Agent:', navigator.userAgent);
console.log('URL atual:', window.location.href);
