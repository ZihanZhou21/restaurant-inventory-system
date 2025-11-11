# Vercel KV 配置说明

本项目已从 Prisma + SQLite 迁移到 Vercel KV (Redis)。

## 环境变量配置

### 1. 在 Vercel 项目中配置 KV

1. 登录 Vercel Dashboard
2. 进入你的项目设置
3. 在 Storage 标签页中创建 KV Database
4. 复制环境变量到项目

### 2. 本地开发环境变量

创建 `.env.local` 文件（如果还没有），添加以下环境变量：

```env
# Vercel KV 配置
KV_REST_API_URL=your_kv_rest_api_url
KV_REST_API_TOKEN=your_kv_rest_api_token
KV_REST_API_READ_ONLY_TOKEN=your_kv_read_only_token
```

这些环境变量会在你创建 Vercel KV Database 后自动添加到项目中。

### 3. 获取环境变量

在 Vercel Dashboard 中：

1. 进入你的项目
2. 点击 Settings > Environment Variables
3. 找到 KV 相关的环境变量并复制

或者在 Vercel CLI 中：

```bash
vercel env pull .env.local
```

## 数据结构

### 键名规范

- `item:{id}` - 单个物料
- `items:list` - 所有物料 ID 列表（Set）
- `purchase:{id}` - 单个采购计划
- `purchase:{date}:{itemId}` - 采购计划查找索引
- `purchases:date:{date}` - 某日期的采购计划 ID 列表（Set）
- `purchases:list` - 所有采购计划 ID 列表（Set）
- `inventory:{id}` - 单个库存记录
- `inventory:{date}:{itemId}` - 库存记录查找索引
- `inventories:date:{date}` - 某日期的库存记录 ID 列表（Set）
- `inventories:list` - 所有库存记录 ID 列表（Set）

## 迁移说明

### 从 Prisma 迁移数据（可选）

如果需要从现有的 Prisma 数据库迁移数据到 KV，可以创建一个迁移脚本：

```typescript
// scripts/migrate-to-kv.ts
// 运行此脚本将现有数据迁移到 KV
```

### 注意事项

1. KV 是键值存储，不支持关系型查询
2. 所有查询都需要通过索引进行
3. 数据以 JSON 格式存储
4. 需要手动维护索引（如日期索引、列表索引等）

## 开发

本地开发时，确保 `.env.local` 文件包含正确的 KV 环境变量。

运行项目：

```bash
npm run dev
```

## 部署

部署到 Vercel 时，环境变量会自动从项目设置中读取，无需额外配置。
