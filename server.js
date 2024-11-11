// 1. 首先确保所有导入语句都在文件最顶部
import { createServer } from 'http';
import fs from 'fs';

// 2. 设置基本配置
const PORT = process.env.PORT || 3000;
const JOBS = JSON.parse(fs.readFileSync('./jobs.json', 'utf8'));
const jobs = JOBS.jobs || [];

// 在顶部配置区域下方添加这个辅助函数
const saveJobsToFile = async (jobs) => {
  try {
    await fs.promises.writeFile(
      './jobs.json',
      JSON.stringify({ jobs }, null, 2),
      'utf8'
    );
    return true;
  } catch (err) {
    console.error('保存文件失败:', err);
    return false;
  }
};

// 3. 中间件定义
const logger = (req, res, next) => {
  console.log(`${req.method}  ${req.url}`);
  next();
};

const jsonMiddleware = (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
};

// 4. 路由处理器
const getJobsHandler = (req, res) => {
  res.write(JSON.stringify(jobs));
  res.end();
};

const getJobByIdHandler = (req, res) => {
  // const lastNum = req.url.split('/').length();
  const id = req.url.split('/')[2];
  console.log(id);
  const job = jobs.find((job) => job.id === id);
  // console.log(`id: ${jobs[0].id}  type: ${typeof jobs[0].id}`);
  if (job) {
    res.write(JSON.stringify(job));
  } else {
    res.statusCode = 404;
    res.write(JSON.stringify({ message: 'Job not found' }));
  }
  res.end();
};

// post 创建新数据的方法
const createJobHandler = async (req, res) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });
  req.on('end', async () => {
    const newJob = JSON.parse(body);
    newJob.id = jobs.length + 1 + '';
    jobs.push(newJob);
    const saved = await saveJobsToFile(jobs);
    res.statusCode = 201;
    res.write(JSON.stringify(newJob));
    res.end();
  });
};

// delete 删除的方法
const deleteJobHandler = async (req, res) => {
  const id = req.url.split('/')[2];
  const jobIndex = jobs.findIndex((job) => job.id === id);

  if (jobIndex === -1) {
    res.statusCode = 404;
    res.write(JSON.stringify({ message: '要删除的工作没找到' }));
  } else {
    jobs.splice(jobIndex, 1);
    const saved = await saveJobsToFile(jobs);
    res.statusCode = 200;
    res.write(JSON.stringify({ message: '已经删除' }));
  }
  res.end();
};

// 更改数据的方法
const putJobHandler = async (req, res) => {
  const id = req.url.split('/')[2];
  const jobIndex = jobs.findIndex((job) => job.id === id);

  if (jobIndex === -1) {
    res.statusCode = 404;
    res.write(JSON.stringify({ message: '找不到要编辑的工作' }));
    res.end();
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });
  req.on('end', async () => {
    const updatedJob = JSON.parse(body);
    jobs[jobIndex] = {
      id,
      ...updatedJob,
    };
    const saved = await saveJobsToFile(jobs);
    res.statusCode = 200;
    res.end(JSON.stringify(jobs[jobIndex])); // 直接通过 end() 发送数据
  });
};

const notFoundHandler = (req, res) => {
  res.statusCode = 404;
  res.write(JSON.stringify({ message: 'Route not found' }));
  res.end();
};

// 5. 服务器创建和路由处理
const server = createServer((req, res) => {
  logger(req, res, () => {
    jsonMiddleware(req, res, () => {
      if (req.url === '/jobs' && req.method === 'GET') {
        // 查
        getJobsHandler(req, res);
      } else if (req.url.match(/\/jobs\/([0-9]+)/) && req.method === 'GET') {
        // 仔细查
        getJobByIdHandler(req, res);
      } else if (req.url === '/jobs' && req.method === 'POST') {
        // 增
        createJobHandler(req, res);
      } else if (req.url.match(/\/jobs\/([0-9]+)/) && req.method === 'DELETE') {
        // 删
        deleteJobHandler(req, res);
      } else if (req.url.match(/\/jobs\/([0-9]+)/) && req.method === 'PUT') {
        // 改
        putJobHandler(req, res);
      } else {
        notFoundHandler(req, res);
      }
    });
  });
});

// 6. 启动服务器
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
