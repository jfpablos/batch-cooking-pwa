import { useAppStore } from '../../store/useAppStore';
import { Spinner } from '../Common/Loading';

export function LoadingState() {
  const { generationStep, generationProgress } = useAppStore();

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </div>

      <div className="space-y-2 w-full max-w-xs">
        <p className="text-base font-semibold text-gray-800 dark:text-gray-200">
          {generationStep || 'Generando tu menú...'}
        </p>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${generationProgress}%` }}
          />
        </div>
        <p className="text-sm text-gray-400">{generationProgress}%</p>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
        Estamos calculando el menú óptimo para tus necesidades de crossfit. Puede tardar hasta 30 segundos.
      </p>
    </div>
  );
}
