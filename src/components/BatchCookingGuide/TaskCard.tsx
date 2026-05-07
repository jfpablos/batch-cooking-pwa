import { Clock, GitBranch } from 'lucide-react';
import type { BatchTask } from '../../types';

interface TaskCardProps {
  task: BatchTask;
  isLast: boolean;
}

export function TaskCard({ task, isLast }: TaskCardProps) {
  return (
    <div className="flex gap-3">
      {/* Timeline */}
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center flex-shrink-0 z-10">
          {task.order}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 mt-1" style={{ minHeight: 24 }} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="bg-card dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">{task.title}</h3>
            <span className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
              <Clock size={11} /> {task.duration} min
            </span>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{task.description}</p>

          {task.parallelWith !== null && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1.5 rounded-lg">
              <GitBranch size={12} />
              Hacer en paralelo con la tarea #{task.parallelWith}
            </div>
          )}

          {task.storageResult && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2.5 py-1.5 rounded-lg">
              📦 {task.storageResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
