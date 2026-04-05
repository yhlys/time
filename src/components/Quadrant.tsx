import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard, { TASK_TYPES } from './TaskCard';

export default function Quadrant({
  typeId,
  tasks,
  onDelete,
  onUpdateDeadline,
}: {
  typeId: number;
  tasks: any[];
  onDelete: (id: number) => void;
  onUpdateDeadline: (id: number, deadline: string | null) => Promise<void> | void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `quadrant-${typeId}`,
    data: { type: 'Quadrant', typeId },
  });

  const typeInfo = TASK_TYPES[typeId as keyof typeof TASK_TYPES];

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full min-h-0 flex-col overflow-hidden transition-colors ${isOver ? 'bg-white/10' : ''}`}
    >
      <div className="sticky top-0 z-10 flex justify-center p-3">
        <span className="inline-flex items-center justify-center rounded-full border border-white/70 bg-white/55 px-5 py-1.5 text-sm font-medium text-black shadow-sm backdrop-blur-md">
          {typeInfo.label}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onDelete={onDelete} onUpdateDeadline={onUpdateDeadline} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-white/50">拖拽事务到这里</div>
        )}
      </div>
    </div>
  );
}
