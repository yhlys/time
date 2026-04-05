import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, Typography, Tag, Button, Popconfirm, Modal, DatePicker, Message } from '@arco-design/web-react';
import { Clock, Trash2, CalendarClock } from 'lucide-react';
import dayjs from 'dayjs';

export const TASK_TYPES = {
  1: { label: '重要紧急', color: 'red', borderColor: '#ef4444' },
  2: { label: '重要不紧急', color: 'orange', borderColor: '#f97316' },
  3: { label: '紧急不重要', color: 'blue', borderColor: '#3b82f6' },
  4: { label: '不重要不紧急', color: 'gray', borderColor: '#9ca3af' },
};

export default function TaskCard({
  task,
  onDelete,
  onUpdateDeadline,
}: {
  task: any;
  onDelete: (id: number) => void;
  onUpdateDeadline: (id: number, deadline: string | null) => Promise<void> | void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'Task', task },
  });

  const [deadlineModalVisible, setDeadlineModalVisible] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<any>(null);
  const [savingDeadline, setSavingDeadline] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const typeInfo = TASK_TYPES[task.type as keyof typeof TASK_TYPES];
  const deadlineText = task.deadline
    ? new Date(task.deadline).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '无截止日期';

  const openDeadlineModal = () => {
    setEditingDeadline(task.deadline ? dayjs(task.deadline) : null);
    setDeadlineModalVisible(true);
  };

  const handleDeadlineSave = async () => {
    setSavingDeadline(true);
    try {
      const isoDeadline = editingDeadline
        ? typeof editingDeadline?.toISOString === 'function'
          ? editingDeadline.toISOString()
          : new Date(editingDeadline).toISOString()
        : null;
      await onUpdateDeadline(task.id, isoDeadline);
      setDeadlineModalVisible(false);
    } catch {
      Message.error('更新截止时间失败');
    } finally {
      setSavingDeadline(false);
    }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-3 cursor-grab active:cursor-grabbing">
      <Card
        className="shadow-sm transition-shadow hover:shadow-md !rounded-none"
        style={{
          borderRadius: 0,
          borderLeftWidth: '5px',
          borderLeftStyle: 'solid',
          borderLeftColor: typeInfo.borderColor,
        }}
        bodyStyle={{ padding: '12px' }}
      >
        <div className="flex items-start justify-between">
          <Typography.Text bold className="flex-1 break-words pr-2 text-gray-800">
            {task.name}
          </Typography.Text>
          <Popconfirm title="确定要删除这个事务吗？" onOk={() => onDelete(task.id)}>
            <Button
              type="text"
              status="danger"
              size="mini"
              icon={<Trash2 className="h-3.5 w-3.5" />}
              className="!p-1 shrink-0"
              onPointerDown={(e) => e.stopPropagation()}
            />
          </Popconfirm>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{deadlineText}</span>
            <Button
              type="text"
              size="mini"
              className="!p-0.5 !text-gray-500 hover:!text-blue-600"
              icon={<CalendarClock className="h-3.5 w-3.5" />}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                openDeadlineModal();
              }}
            />
          </div>
          <Tag color={typeInfo.color} size="small" className="!text-[10px]">
            {typeInfo.label}
          </Tag>
        </div>
      </Card>

      <Modal
        title="修改截止时间"
        visible={deadlineModalVisible}
        onOk={handleDeadlineSave}
        onCancel={() => setDeadlineModalVisible(false)}
        okButtonProps={{ loading: savingDeadline }}
      >
        <DatePicker
          style={{ width: '100%' }}
          showTime
          allowClear
          value={editingDeadline}
          onChange={(value) => setEditingDeadline(value)}
        />
      </Modal>
    </div>
  );
}
