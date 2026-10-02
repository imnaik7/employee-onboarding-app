import { useState } from 'react';
import { motion, LayoutGroup } from 'motion/react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Avatar } from '@fluentui/react-components';
import { Calendar16Regular, Money16Regular, ReOrderDotsVertical16Regular } from '@fluentui/react-icons';
import type { Candidate } from '../services/onboarding';
import { formatDate, formatSalary } from '../utils/format';
import { COLUMNS, canDrop, type ColumnId } from '../utils/pipeline';
import { StatusBadge } from './StatusBadge';

interface Props {
  candidates: Candidate[];
  compact: boolean;
  onOpen: (id: number) => void;
  onMove: (c: Candidate, to: ColumnId) => void;
}

function CardBody({ c, compact, dragging }: { c: Candidate; compact: boolean; dragging?: boolean }) {
  return (
    <div className={`kcard ${compact ? 'compact' : ''} ${dragging ? 'dragging' : ''}`}>
      <div className="kcard-top">
        <Avatar name={c.fullName} size={compact ? 24 : 32} color="colorful" />
        <div className="kcard-name">
          <strong>{c.fullName}</strong>
          {!compact && <span className="muted small">{c.position || 'No position'}{c.department ? ` · ${c.department}` : ''}</span>}
        </div>
        <ReOrderDotsVertical16Regular className="kcard-grip" aria-hidden />
      </div>
      {!compact && (
        <div className="kcard-meta">
          <StatusBadge status={c.status} />
          {!!c.salary && (
            <span className="muted small">
              <Money16Regular /> {formatSalary(c.salary)}
            </span>
          )}
          {!!c.startDate && (
            <span className="muted small">
              <Calendar16Regular /> {formatDate(c.startDate)}
            </span>
          )}
        </div>
      )}
      {!compact && c.skills && (
        <div className="kcard-skills">
          {c.skills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 3)
            .map((s) => (
              <span key={s} className="tag">
                {s}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

function DraggableCard({ c, compact, onOpen }: { c: Candidate; compact: boolean; onOpen: (id: number) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: c.id, data: { candidate: c } });
  return (
    <motion.button
      layout
      layoutId={`card-${c.id}`}
      ref={setNodeRef}
      className="kcard-btn"
      style={{ opacity: isDragging ? 0.35 : 1 }}
      onClick={() => onOpen(c.id)}
      aria-label={`${c.fullName}, ${c.status}. Press space to pick up and move.`}
      {...attributes}
      {...listeners}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <CardBody c={c} compact={compact} />
    </motion.button>
  );
}

function Column({
  col,
  items,
  compact,
  onOpen,
  dragging,
}: {
  col: (typeof COLUMNS)[number];
  items: Candidate[];
  compact: boolean;
  onOpen: (id: number) => void;
  dragging: Candidate | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const allowed = dragging ? canDrop(dragging, col.id) : null;
  return (
    <section
      ref={setNodeRef}
      className={`kcol ${isOver ? 'over' : ''} ${allowed === true ? 'can-drop' : allowed === false ? 'no-drop' : ''}`}
      aria-label={`${col.title} column, ${items.length} candidates`}
    >
      <header className="kcol-head">
        <span className="kcol-dot" style={{ background: col.color, boxShadow: `0 0 12px ${col.color}` }} />
        <strong>{col.title}</strong>
        <span className="kcol-count">{items.length}</span>
      </header>
      <div className="kcol-body">
        {items.length === 0 && <div className="kcol-empty">{allowed ? 'Drop here' : 'Empty'}</div>}
        {items.map((c) => (
          <DraggableCard key={c.id} c={c} compact={compact} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

export function PipelineBoard({ candidates, compact, onOpen, onMove }: Props) {
  const [dragging, setDragging] = useState<Candidate | null>(null);
  const sensors = useSensors(
    // Small distance so a click still opens the card
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const onStart = (e: DragStartEvent) => setDragging((e.active.data.current?.candidate as Candidate) ?? null);
  const onEnd = (e: DragEndEvent) => {
    const c = e.active.data.current?.candidate as Candidate | undefined;
    setDragging(null);
    if (!c || !e.over) return;
    const to = e.over.id as ColumnId;
    const from = COLUMNS.find((col) => col.statuses.includes(c.status))?.id;
    if (to !== from) onMove(c, to);
  };

  return (
    <DndContext sensors={sensors} onDragStart={onStart} onDragEnd={onEnd} onDragCancel={() => setDragging(null)}>
      <LayoutGroup>
        <div className="kanban">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              col={col}
              items={candidates.filter((c) => col.statuses.includes(c.status))}
              compact={compact}
              onOpen={onOpen}
              dragging={dragging}
            />
          ))}
        </div>
      </LayoutGroup>
      <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
        {dragging ? <CardBody c={dragging} compact={compact} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
