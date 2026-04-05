import { useState, useEffect } from 'react';
import { Layout, Form, Input, DatePicker, Select, Button, Message, Typography, Calendar } from '@arco-design/web-react';
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { LogOut, Plus } from 'lucide-react';
import { Lunar } from 'lunar-javascript';
import Quadrant from '../components/Quadrant';
import TaskCard from '../components/TaskCard';
import { parseApiResponse } from '../utils/http';

const { Header, Content, Sider } = Layout;

const getUsernameFromToken = (token: string) => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return '用户';

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(normalized);
    const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));

    return parsed?.username || '用户';
  } catch {
    return '用户';
  }
};

export default function Dashboard({ token, setToken }: { token: string; setToken: (token: string | null) => void }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const username = getUsernameFromToken(token);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        setToken(null);
        return;
      }
      const data = await parseApiResponse(res);
      setTasks(data);
    } catch {
      Message.error('获取事务失败');
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [token]);

  const handleCreateTask = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: values.name,
          type: values.type,
          deadline: values.deadline ? new Date(values.deadline).toISOString() : null,
        }),
      });

      if (!res.ok) throw new Error('创建失败');

      Message.success('创建成功');
      form.resetFields();
      fetchTasks();
    } catch (err: any) {
      Message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('删除失败');
      Message.success('删除成功');
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      Message.error(err.message);
    }
  };

  const handleUpdateDeadline = async (id: number, deadline: string | null) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, deadline } : t)));

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...task,
          deadline,
        }),
      });
      if (!res.ok) throw new Error('更新截止时间失败');
      const updated = await parseApiResponse(res);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {
      Message.error('更新截止时间失败');
      fetchTasks();
    }
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    setActiveTask(task);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id;
    const activeIndex = tasks.findIndex((t) => t.id === activeId);
    if (activeIndex === -1) return;

    const activeTaskItem = tasks[activeIndex];
    const overData = over.data.current;

    if (overData?.type === 'Task') {
      const overId = over.id;
      const overIndex = tasks.findIndex((t) => t.id === overId);
      if (overIndex === -1) return;

      const overTask = tasks[overIndex];
      const newTypeId = overTask.type;

      if (activeTaskItem.type === newTypeId) {
        if (activeIndex !== overIndex) {
          setTasks(arrayMove(tasks, activeIndex, overIndex));
        }
        return;
      }

      const updatedTasks = [...tasks];
      const [movedTask] = updatedTasks.splice(activeIndex, 1);
      const targetIndex = updatedTasks.findIndex((t) => t.id === overId);
      updatedTasks.splice(targetIndex === -1 ? updatedTasks.length : targetIndex, 0, {
        ...movedTask,
        type: newTypeId,
      });
      setTasks(updatedTasks);

      try {
        await fetch(`/api/tasks/${activeId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...activeTaskItem,
            type: newTypeId,
          }),
        });
      } catch {
        Message.error('更新事务状态失败');
        fetchTasks();
      }
      return;
    }

    if (overData?.type === 'Quadrant') {
      const newTypeId = overData.typeId;
      if (activeTaskItem.type === newTypeId) return;

      const updatedTasks = [...tasks];
      const [movedTask] = updatedTasks.splice(activeIndex, 1);

      let insertIndex = updatedTasks.length;
      for (let i = updatedTasks.length - 1; i >= 0; i -= 1) {
        if (updatedTasks[i].type === newTypeId) {
          insertIndex = i + 1;
          break;
        }
      }

      updatedTasks.splice(insertIndex, 0, {
        ...movedTask,
        type: newTypeId,
      });
      setTasks(updatedTasks);

      try {
        await fetch(`/api/tasks/${activeId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...activeTaskItem,
            type: newTypeId,
          }),
        });
      } catch {
        Message.error('更新事务状态失败');
        fetchTasks();
      }
    }
  };

  const handleLogout = () => {
    setToken(null);
  };

  const renderLunar = (currentDate: any) => {
    const date = currentDate.toDate();
    const lunar = Lunar.fromDate(date);
    const lunarDay = lunar.getDayInChinese();
    const term = lunar.getJieQi();
    const festival = lunar.getFestivals()[0];

    const display = term || festival || lunarDay;
    const isHighlight = term || festival;

    return (
      <div className={`mt-0.5 text-center text-[10px] leading-none ${isHighlight ? 'text-red-500' : 'text-gray-400'}`}>
        {display}
      </div>
    );
  };

  return (
    <Layout className="h-screen bg-gray-50">
      <Header className="z-10 flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📌</span>
          <Typography.Title heading={5} className="!m-0 text-gray-800">
            四象限时间管理
          </Typography.Title>
        </div>
        <Typography.Text className="flex-1 pl-3 pr-8 self-end pb-3" style={{ color: '#7c22bf' }}>
          拖拽卡片可调整事务象限，任务过多时可在象限内滚动查看。
        </Typography.Text>
        <div className="flex items-center gap-2">
          <Typography.Text className="whitespace-nowrap text-gray-700">
            hello，{username}！
          </Typography.Text>
          <Button type="text" onClick={handleLogout}>
            <span className="flex items-center gap-2">
              <LogOut className="h-4 w-4 shrink-0" />
              <span>退出登录</span>
            </span>
          </Button>
        </div>
      </Header>

      <Layout className="flex-1 overflow-hidden">
        <Content
          className="relative flex flex-col overflow-hidden"
          style={{
            backgroundImage: 'url("/TsingHua.JPG")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="absolute inset-0 z-0 bg-black/20"></div>

          <div className="relative z-10 h-full px-6 py-5">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="relative h-full">
                <div className="absolute inset-0 z-0 pointer-events-none">
                  <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-gray-500/70"></div>
                  <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gray-500/70"></div>
                </div>

                <div className="absolute inset-0 z-10 grid grid-cols-2 grid-rows-2 min-h-0">
                  <Quadrant
                    typeId={2}
                    tasks={tasks.filter((t) => t.type === 2)}
                    onDelete={handleDeleteTask}
                    onUpdateDeadline={handleUpdateDeadline}
                  />
                  <Quadrant
                    typeId={1}
                    tasks={tasks.filter((t) => t.type === 1)}
                    onDelete={handleDeleteTask}
                    onUpdateDeadline={handleUpdateDeadline}
                  />
                  <Quadrant
                    typeId={4}
                    tasks={tasks.filter((t) => t.type === 4)}
                    onDelete={handleDeleteTask}
                    onUpdateDeadline={handleUpdateDeadline}
                  />
                  <Quadrant
                    typeId={3}
                    tasks={tasks.filter((t) => t.type === 3)}
                    onDelete={handleDeleteTask}
                    onUpdateDeadline={handleUpdateDeadline}
                  />
                </div>
              </div>

              <DragOverlay>
                {activeTask ? <TaskCard task={activeTask} onDelete={() => {}} onUpdateDeadline={async () => {}} /> : null}
              </DragOverlay>
            </DndContext>
          </div>
        </Content>

        <Sider width={340} className="z-10 flex flex-col overflow-y-auto border-l border-gray-200 bg-white p-4 shadow-[-4px_0_15px_rgba(0,0,0,0.02)]">
          <div className="mx-auto w-full max-w-[300px]">
            <div className="mb-6">
              <Calendar panel dateInnerContent={renderLunar} />
            </div>

            <div className="mb-4">
              <Typography.Title heading={5} className="!m-0 flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                新建事务
              </Typography.Title>
            </div>

            <Form form={form} layout="vertical" onSubmit={handleCreateTask}>
              <Form.Item label="事务名称" field="name" rules={[{ required: true, message: '请输入事务名称' }]}>
                <Input placeholder="例如：完成季度报告" />
              </Form.Item>

              <Form.Item label="事务类型" field="type" rules={[{ required: true, message: '请选择事务类型' }]} initialValue={1}>
                <Select placeholder="请选择">
                  <Select.Option value={1}>重要紧急</Select.Option>
                  <Select.Option value={2}>重要不紧急</Select.Option>
                  <Select.Option value={3}>紧急不重要</Select.Option>
                  <Select.Option value={4}>不重要不紧急</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item label="截止时间" field="deadline">
                <DatePicker style={{ width: '100%' }} showTime />
              </Form.Item>

              <Button type="primary" htmlType="submit" long loading={loading} className="mt-4">
                创建事务
              </Button>
            </Form>
          </div>
        </Sider>
      </Layout>
    </Layout>
  );
}

