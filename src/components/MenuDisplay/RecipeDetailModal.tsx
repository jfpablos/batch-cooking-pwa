import { useState } from 'react';
import { Clock, ChefHat, Snowflake, Zap, Play } from 'lucide-react';
import { Modal } from '../Common/Modal';
import { VideoModal } from '../Common/VideoModal';
import { Button } from '../Common/Button';
import { youtubeService } from '../../services/youtubeService';
import { useAppStore } from '../../store/useAppStore';
import type { BaseRecipe, YouTubeVideo } from '../../types';
import { clsx } from 'clsx';

interface RecipeDetailModalProps {
  recipe: BaseRecipe | null;
  isOpen: boolean;
  onClose: () => void;
}

const MACRO_COLORS: Record<string, string> = {
  Calorías: 'text-primary',
  Proteína: 'text-blue-600',
  Carbos: 'text-amber-600',
  Grasa: 'text-green-600',
  Fibra: 'text-purple-600',
};

export function RecipeDetailModal({ recipe, isOpen, onClose }: RecipeDetailModalProps) {
  const { youtubeVideos } = useAppStore();
  const [videoOpen, setVideoOpen] = useState(false);

  if (!recipe) return null;

  const matchedVideo: YouTubeVideo | null = youtubeVideos.length > 0
    ? youtubeService.findMatchingVideo(recipe.name, youtubeVideos)
    : null;

  const macros = [
    { label: 'Calorías', value: recipe.nutrition.calories, unit: 'kcal' },
    { label: 'Proteína', value: recipe.nutrition.protein, unit: 'g' },
    { label: 'Carbos', value: recipe.nutrition.carbs, unit: 'g' },
    { label: 'Grasa', value: recipe.nutrition.fat, unit: 'g' },
    { label: 'Fibra', value: recipe.nutrition.fiber, unit: 'g' },
  ];

  const categoryLabels: Record<string, string> = {
    'desayuno': 'Desayuno',
    'pre-entreno': 'Pre-entreno',
    'principal': 'Comida Principal',
    'post-entreno': 'Post-entreno',
    'cena': 'Cena',
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={recipe.name}>
        <div className="px-5 pb-6 space-y-5">

          {/* Meta info */}
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              {categoryLabels[recipe.category] ?? recipe.category}
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock size={13} /> {recipe.prepTime + recipe.cookTime} min
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <ChefHat size={13} /> {recipe.difficulty}
            </span>
            {recipe.storage.freezable && (
              <span className="text-xs text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full">
                <Snowflake size={13} /> Congelable
              </span>
            )}
          </div>

          {/* Video match */}
          {matchedVideo && (
            <div className="relative rounded-2xl overflow-hidden border border-gray-100">
              <img
                src={matchedVideo.thumbnail}
                alt={matchedVideo.title}
                className="w-full aspect-video object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Button
                  variant="primary"
                  onClick={() => setVideoOpen(true)}
                  icon={<Play size={18} fill="white" />}
                  className="shadow-lg"
                >
                  Ver vídeo
                </Button>
              </div>
            </div>
          )}

          {/* Macros */}
          <div>
            <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-2">Valores nutricionales</h3>
            <div className="grid grid-cols-5 gap-1.5">
              {macros.map(({ label, value, unit }) => (
                <div key={label} className="text-center bg-gray-50 dark:bg-gray-800 rounded-xl p-2">
                  <p className={clsx('text-base font-bold', MACRO_COLORS[label])}>{value}</p>
                  <p className="text-[10px] text-gray-400 leading-tight">{unit}</p>
                  <p className="text-[10px] text-gray-500 leading-tight">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-2">
              Ingredientes <span className="text-gray-400 font-normal">(1 ración)</span>
            </h3>
            <ul className="space-y-1.5">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{ing.name}</span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-white">
                    {ing.amount}{ing.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Steps */}
          <div>
            <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-2">Preparación</h3>
            <ol className="space-y-2.5">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Storage */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
            <h3 className="font-bold text-sm text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1.5">
              <Snowflake size={14} /> Conservación
            </h3>
            <p className="text-sm text-blue-600 dark:text-blue-300">
              {recipe.storage.instructions} · {recipe.storage.days} días en nevera
            </p>
          </div>

          {/* Batch notes */}
          {recipe.batchNotes && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
              <h3 className="font-bold text-sm text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1.5">
                <Zap size={14} /> Batch cooking (×5)
              </h3>
              <p className="text-sm text-amber-600 dark:text-amber-300">{recipe.batchNotes}</p>
            </div>
          )}
        </div>
      </Modal>

      <VideoModal
        isOpen={videoOpen}
        onClose={() => setVideoOpen(false)}
        video={matchedVideo}
      />
    </>
  );
}
