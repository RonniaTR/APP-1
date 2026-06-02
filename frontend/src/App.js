import React from 'react';
import MobileShell from './components/MobileShell';

/**
 * Kültür Koruma Akademisi — Uygulama kök bileşeni
 *
 * MobileShell; koyu mahogany degrade arka planı üzerinde
 * 286×620'lik cihaz çerçevesini render eder ve tüm sekme
 * geçiş durumunu yönetir.
 * Eski pages/ ve contexts/ dosyaları ekranlar geliştirildiğinde
 * tekrar bağlanmak üzere korunmuştur.
 */
export default function App() {
  return <MobileShell />;
}
