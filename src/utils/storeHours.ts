export function checkStoreOpen(store: any): boolean {
  // Se is_open for false (controle manual), a loja está sempre fechada
  if (store.is_open === false) return false;

  // Se não houver configuração de horas ou for um objeto vazio, assumimos aberta 
  // (fallback para lojas antigas que não rodaram a migration)
  if (!store.opening_hours || Object.keys(store.opening_hours).length === 0) return true;

  const now = new Date();
  const currentDayNum = now.getDay();
  const prevDayNum = currentDayNum === 0 ? 6 : currentDayNum - 1;

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

  const currentDayConfig = store.opening_hours[currentDayNum.toString()];
  const prevDayConfig = store.opening_hours[prevDayNum.toString()];

  // 1. Verificar se estamos no turno do dia anterior (que varou a madrugada)
  if (prevDayConfig && prevDayConfig.isOpen) {
    const pOpen = prevDayConfig.open || '00:00';
    const pClose = prevDayConfig.close || '23:59';
    // Se fechamento for menor que abertura (ex: abre 18h fecha 02h)
    if (pClose < pOpen) {
      if (currentTimeStr <= pClose) {
        return true; // Ainda estamos no turno da madrugada de ontem!
      }
    }
  }

  // 2. Verificar se estamos no turno de hoje
  if (currentDayConfig && currentDayConfig.isOpen) {
    const cOpen = currentDayConfig.open || '00:00';
    const cClose = currentDayConfig.close || '23:59';
    
    if (cClose < cOpen) {
      // Turno de hoje vai varar a madrugada de amanhã
      if (currentTimeStr >= cOpen) {
        return true;
      }
    } else {
      // Turno normal que abre e fecha no mesmo dia
      if (currentTimeStr >= cOpen && currentTimeStr <= cClose) {
        return true;
      }
    }
  }

  return false;
}
