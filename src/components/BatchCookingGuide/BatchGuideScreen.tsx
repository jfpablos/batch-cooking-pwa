import { Clock, Flame, Info } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { Button } from '../Common/Button';
import { useAppStore } from '../../store/useAppStore';

const DEFAULT_TASKS = [
  {
    order: 1,
    title: 'Preparación general',
    description: 'Saca todos los ingredientes de la nevera. Lava y pica todas las verduras. Pon el horno a precalentar a 200°C.',
    duration: 20,
    parallelWith: null,
    storageResult: 'Ingredientes listos para cocinar',
  },
  {
    order: 2,
    title: 'Cocer cereales y legumbres',
    description: 'Pon a cocer el arroz integral (35 min), la quinoa (15 min) y las lentejas si aplica. Usar ollas separadas.',
    duration: 35,
    parallelWith: 3,
    storageResult: 'Guardar en tuppers separados cuando estén fríos',
  },
  {
    order: 3,
    title: 'Hornear proteínas y boniatos',
    description: 'Hornear las pechugas/lomos marinados + boniatos/patatas cortados a 200°C durante 30-35 min.',
    duration: 35,
    parallelWith: 2,
    storageResult: 'Guardar en tuppers en nevera una vez frío',
  },
  {
    order: 4,
    title: 'Cocinar proteínas a la plancha',
    description: 'Planchar las pechugas, filetes de pavo o lomos de pescado que no fueron al horno. 6-7 min por lado.',
    duration: 25,
    parallelWith: null,
    storageResult: 'Cortar en porciones y guardar en tuppers',
  },
  {
    order: 5,
    title: 'Saltear y preparar verduras',
    description: 'Cocer el brócoli al vapor (8 min), saltear champiñones/espinacas/pimientos. Preparar el pisto si aplica.',
    duration: 20,
    parallelWith: 4,
    storageResult: 'Tuppers separados por tipo de verdura',
  },
  {
    order: 6,
    title: 'Distribuir en tuppers',
    description: 'Armar cada tupper diario: proteína + cereal + verdura. Etiquetar con el día de la semana. Guardar en nevera.',
    duration: 15,
    parallelWith: null,
    storageResult: '5 tuppers de comida principal listos en nevera',
  },
];

export function BatchGuideScreen() {
  const { batchGuide, currentMenu, setActiveTab } = useAppStore();

  if (!currentMenu) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-4">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-3xl">
          🔥
        </div>
        <div>
          <p className="font-bold text-gray-800 dark:text-white text-lg">Sin guía disponible</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Genera un menú primero para obtener tu guía de batch cooking
          </p>
        </div>
        <Button variant="primary" onClick={() => setActiveTab(0)} icon={<Flame size={18} />}>
          Generar menú
        </Button>
      </div>
    );
  }

  const tasks = batchGuide?.tasks ?? DEFAULT_TASKS;
  const totalTime = batchGuide?.estimatedTotalTime ?? tasks.reduce((acc, t) => acc + t.duration, 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-4 max-w-lg mx-auto pb-6">

        {/* Header */}
        <div className="bg-amber-500 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Flame size={22} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-lg">Guía Batch Cooking</p>
              <p className="text-white/70 text-sm">Domingo — prepara toda la semana</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/20 rounded-xl px-3 py-2 mt-3">
            <Clock size={16} />
            <p className="text-sm font-semibold">Tiempo total estimado: {totalTime} minutos ({Math.round(totalTime / 60 * 10) / 10}h)</p>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 flex gap-2">
          <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Las tareas marcadas como "en paralelo" se pueden hacer simultáneamente. Pon el horno en marcha primero y aprovecha ese tiempo para preparar otras cosas.
          </p>
        </div>

        {/* Tasks timeline */}
        <div>
          <h2 className="font-bold text-gray-800 dark:text-white mb-3">Orden de preparación</h2>
          <div>
            {tasks.map((task, i) => (
              <TaskCard
                key={task.order}
                task={task}
                isLast={i === tasks.length - 1}
              />
            ))}
          </div>
        </div>

        {/* Storage guide */}
        <div className="bg-card dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
          <h3 className="font-bold text-gray-800 dark:text-white mb-3">📦 Conservación</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-gray-50 dark:border-gray-800">
              <span className="text-gray-600 dark:text-gray-400">Proteínas cocinadas</span>
              <span className="font-medium text-gray-800 dark:text-white">4-5 días nevera</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50 dark:border-gray-800">
              <span className="text-gray-600 dark:text-gray-400">Cereales cocidos</span>
              <span className="font-medium text-gray-800 dark:text-white">4-5 días nevera</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50 dark:border-gray-800">
              <span className="text-gray-600 dark:text-gray-400">Verduras salteadas</span>
              <span className="font-medium text-gray-800 dark:text-white">3-4 días nevera</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50 dark:border-gray-800">
              <span className="text-gray-600 dark:text-gray-400">Pescado cocinado</span>
              <span className="font-medium text-gray-800 dark:text-white">2-3 días nevera</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-600 dark:text-gray-400">Congelable</span>
              <span className="font-medium text-gray-800 dark:text-white">Pollo, pavo, ternera hasta 3 meses</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
