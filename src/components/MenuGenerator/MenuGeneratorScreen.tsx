import { Zap, User, Flame, Beef, Wheat, Droplets, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '../Common/Button';
import { Card } from '../Common/Card';
import { LoadingState } from './LoadingState';
import { useAppStore } from '../../store/useAppStore';
import { useMenuGeneration } from '../../hooks/useMenuGeneration';
import { formatDateTime, getCurrentWeekAndYear } from '../../utils/dateUtils';
import { storageService } from '../../services/storageService';
import { STORAGE_KEYS } from '../../utils/storageKeys';
import { geminiService } from '../../services/geminiService';

const MACRO_GOALS = [
  { icon: Flame, label: 'Calorías', value: '3.290 kcal', color: 'text-primary', bg: 'bg-primary/10' },
  { icon: Beef, label: 'Proteína', value: '165 g', color: 'text-blue-600', bg: 'bg-blue-50' },
  { icon: Wheat, label: 'Carbos', value: '454 g', color: 'text-amber-600', bg: 'bg-amber-50' },
  { icon: Droplets, label: 'Grasa', value: '91 g', color: 'text-green-600', bg: 'bg-green-50' },
];

export function MenuGeneratorScreen() {
  const { isGenerating, error, currentMenu } = useAppStore();
  const { generateMenu } = useMenuGeneration();
  const { weekNumber, year } = getCurrentWeekAndYear();
  const lastGenDate = storageService.get<string>(STORAGE_KEYS.LAST_GEN_DATE);
  const geminiOk = geminiService.isConfigured();

  if (isGenerating) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-5 max-w-lg mx-auto pb-6">

        {/* Hero */}
        <div className="text-center pt-2 pb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-3 shadow-lg shadow-primary/30">
            <Zap size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Menú Semanal
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Semana {weekNumber} · {year} · Lunes a Viernes
          </p>
        </div>

        {/* Perfil nutricional */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <User size={18} className="text-secondary" />
            <h2 className="font-bold text-gray-800 dark:text-white text-sm">Tu perfil nutricional</h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            82,5 kg · Crossfit 5 días/semana · Rendimiento deportivo
          </p>
          <div className="grid grid-cols-2 gap-2">
            {MACRO_GOALS.map(({ icon: Icon, label, value, color, bg }) => (
              <div key={label} className={`flex items-center gap-2.5 p-2.5 rounded-xl ${bg}`}>
                <Icon size={18} className={color} />
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className={`text-sm font-bold ${color}`}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Estado Gemini */}
        <Card padding="sm">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${geminiOk ? 'bg-success' : 'bg-amber-400'}`} />
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {geminiOk
                ? 'Gemini AI configurado — menús con IA'
                : 'Sin API key Gemini — usará banco de recetas base (25 recetas)'}
            </p>
          </div>
        </Card>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-3 bg-error/10 border border-error/30 rounded-xl">
            <AlertCircle size={18} className="text-error flex-shrink-0 mt-0.5" />
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* Último menú generado */}
        {currentMenu && (
          <Card padding="sm">
            <p className="text-xs text-gray-500">Último menú generado</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">
              Semana {currentMenu.weekNumber} · {currentMenu.year}
            </p>
            {lastGenDate && (
              <p className="text-xs text-gray-400">{formatDateTime(lastGenDate)}</p>
            )}
          </Card>
        )}

        {/* Botón principal */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={generateMenu}
          icon={currentMenu ? <RefreshCw size={22} /> : <Zap size={22} />}
        >
          {currentMenu ? 'Regenerar menú semanal' : 'Generar menú semanal'}
        </Button>

        {/* Info */}
        <div className="text-center space-y-1">
          <p className="text-xs text-gray-400">
            Se generan 5 días (L-V) con 5 comidas/día
          </p>
          <p className="text-xs text-gray-400">
            Sistema anti-repetición activo (últimas 4 semanas)
          </p>
        </div>

        {/* Cómo funciona */}
        <Card>
          <h3 className="font-bold text-sm text-gray-800 dark:text-white mb-2">¿Cómo funciona?</h3>
          <ol className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex gap-2"><span className="text-primary font-bold">1.</span> Pulsa "Generar menú" los fines de semana</li>
            <li className="flex gap-2"><span className="text-primary font-bold">2.</span> Revisa las recetas en "Mi Menú"</li>
            <li className="flex gap-2"><span className="text-primary font-bold">3.</span> Haz la compra con la lista generada</li>
            <li className="flex gap-2"><span className="text-primary font-bold">4.</span> Sigue la Guía Batch el domingo</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
