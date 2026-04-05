import { useState } from 'react';
import { Card, Form, Input, Button, Message, Typography } from '@arco-design/web-react';
import { LogIn, UserPlus } from 'lucide-react';
import { parseApiResponse } from '../utils/http';

export default function Login({ setToken }: { setToken: (token: string) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/login' : '/api/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(data.error || '请求失败');
      }

      if (isLogin) {
        Message.success('登录成功');
        setToken(data.token);
      } else {
        Message.success('注册成功，请登录');
        setIsLogin(true);
        form.resetFields();
      }
    } catch (err: any) {
      Message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md rounded-xl border-0 shadow-lg">
        <div className="mb-8 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <span className="text-3xl">📌</span>
            <Typography.Title heading={3} className="!m-0">
              四象限时间管理
            </Typography.Title>
          </div>
          <Typography.Text type="secondary">
            {isLogin ? '欢迎回来，请登录你的账号' : '创建新账号来管理你的事务'}
          </Typography.Text>
        </div>

        <Form form={form} layout="vertical" onSubmit={handleSubmit}>
          <Form.Item label="用户名" field="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="请输入用户名" size="large" />
          </Form.Item>

          <Form.Item label="密码" field="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password placeholder="请输入密码" size="large" />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            long
            loading={loading}
          >
            <span className="flex w-full items-center justify-center gap-2">
              {isLogin ? <LogIn className="h-4 w-4 shrink-0" /> : <UserPlus className="h-4 w-4 shrink-0" />}
              <span>{isLogin ? '登录' : '注册'}</span>
            </span>
          </Button>
        </Form>

        <div className="mt-6 text-center">
          <Button
            type="text"
            onClick={() => {
              setIsLogin(!isLogin);
              form.resetFields();
            }}
          >
            {isLogin ? '没有账号？点击注册' : '已有账号？点击登录'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

