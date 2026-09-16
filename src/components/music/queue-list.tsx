'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslations } from '@/providers/use-translations';
import { Clock3, GripVertical, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';

export interface QueueRow {
  id: number;
  title: string;
  artist: string;
  addedBy: string;
  isNow: boolean;
}

function SortableQueueRow({
  row,
  index,
  total,
  canControl,
  onMove,
  onRemove,
}: {
  row: QueueRow;
  index: number;
  total: number;
  canControl: boolean;
  onMove: (qi: number, toIndex: number) => void;
  onRemove: (qi: number) => void;
}) {
  const t = useTranslations();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
    disabled: !canControl,
  });

  return (
    <div
      ref={setNodeRef}
      className={`music-queue-item ${isDragging ? 'dragging' : ''} ${row.isNow ? 'is-now' : ''}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div className="music-queue-order">{row.isNow ? t('music.now') : <Clock3 size={12} />}</div>
      <div className="music-queue-info">
        <b>{row.title}</b>
        <span>{row.artist}</span>
      </div>
      <span className="music-queue-added">@{row.addedBy}</span>
      {canControl && (
        <>
          <span className="music-grip" {...attributes} {...listeners} title={t('music.queueHint')}>
            <GripVertical size={13} />
          </span>
          <span className="music-move">
            <button
              type="button"
              className="btn-icon"
              disabled={index === 0}
              onClick={() => onMove(row.id, index - 1)}
              title={t('music.moveUp')}
            >
              <ChevronUp size={13} />
            </button>
            <button
              type="button"
              className="btn-icon"
              disabled={index === total - 1}
              onClick={() => onMove(row.id, index + 1)}
              title={t('music.moveDown')}
            >
              <ChevronDown size={13} />
            </button>
          </span>
          <button type="button" className="btn-icon danger" onClick={() => onRemove(row.id)} title={t('music.removeFromQueue')}>
            <Trash2 size={13} />
          </button>
        </>
      )}
    </div>
  );
}

export function QueueList({
  rows,
  canControl,
  onMove,
  onRemove,
  emptyText,
  hintText,
}: {
  rows: QueueRow[];
  canControl: boolean;
  onMove: (qi: number, toIndex: number) => void;
  onRemove: (qi: number) => void;
  emptyText: string;
  hintText: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = rows.findIndex((r) => r.id === active.id);
    const to = rows.findIndex((r) => r.id === over.id);
    if (from === -1 || to === -1) return;
    onMove(active.id as number, to);
  };

  if (rows.length === 0) return <div className="empty-state" style={{ padding: 20 }}>{emptyText}</div>;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
        <div className="music-queue">
          <div className="music-queue-hint">{hintText}</div>
          {rows.map((row, i) => (
            <SortableQueueRow
              key={row.id}
              row={row}
              index={i}
              total={rows.length}
              canControl={canControl}
              onMove={onMove}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}